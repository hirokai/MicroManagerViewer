import json
import os
from joblib import Parallel, delayed
import multiprocessing
import logging
from test_config import datasets

logging.basicConfig(level=logging.WARNING)

force_imgout = False
img_quality = ['s1'] # options: 'full', 's1'
imgcount = 0


def is_number(s):
	try:
		float(s)
		return True
	except ValueError:
		return False



def my_parsetime(str):
	from datetime import timedelta,datetime
	try:
		offset = int(str[-5:])
		delta = timedelta(hours = offset / 100)

		fmt = "%Y-%m-%d %H:%M:%S"
		time = datetime.strptime(str[:-6], fmt)
		time -= delta
		return time
	except:
		return None


def readMetadataFolder(folder, pos_subfolder, metaset=False, metaset_idx=None,metaset_dim='pos'):
	from datetime import timedelta
	folderimgcount = 0

	logging.debug('readMetadataFolder(): %s, %s' % (folder, pos_subfolder))
	path = os.path.join(folder, pos_subfolder, 'metadata.txt')
	if not os.path.exists(path):
		logging.info('readMetadataFolder(): metadata.txt not found: %s' % (path))
		return None
	import sys

	sys.stdout.write('.')
	# Read coord from metadata.txt
	res = []
	with open(path) as f:
		obj = json.load(f)
		fr_keys = obj.keys()
		set_uuid = obj['Summary']['UUID']
		outfolder = os.path.join('..', 'images', set_uuid)
		if not os.path.exists(outfolder):
			os.makedirs(outfolder)
		for fr in fr_keys:
			if fr == 'Summary':
				continue
			chname = obj[fr]['Channel']
			objf = obj[fr]
			frame = objf['FrameIndex']
			etime = objf['ElapsedTime-ms']
			stime = obj['Summary']['Time']
			slice = objf['SliceIndex']
			uuid = objf['UUID'] or (set_uuid+'_'+fr)  # Old MicroManager files do not have UUID for images.
			imgpath = os.path.join(folder, pos_subfolder, 'img_%09d_%s_%03d.tif' % (frame, chname, slice))
			import img_convert
			img_convert.convert_multiple(set_uuid, uuid, imgpath, quality=img_quality, overwrite=force_imgout)
			row = (folder, set_uuid, uuid
			       , stime
			       , objf['PositionIndex']
			       , frame
			       , objf['ChannelIndex']
			       , objf['SliceIndex']
			       , etime
			       , objf['PositionName']
			       , objf['XPositionUm']
			       , objf['YPositionUm']
			       , ""
			       , chname,
					"")
			if metaset:
				if metaset_dim == 'pos':
					row = row + (metaset_idx,0,0,0)
				elif metaset_dim == 'frame':
					row = row + (0,metaset_idx,0,0)
				elif metaset_dim == 'ch':
					row = row + (0,0,metaset_idx,0)
				elif metaset_dim == 'slice':
					row = row + (0,0,0,metaset_idx)
			res.append(row)
	return res, set_uuid, imgcount


def write_to_csv(poss, set_uuid, metaset=False):
	import csv

	csvpath = os.path.join('..', 'metadata', set_uuid + '.csv')
	header = ['folder','set_uuid', 'uuid', 'stime', 'pos', 'frame', 'ch', 'slice', 'time', 'posname', 'x', 'y', 'framename', 'chname', 'slicename'] +\
	         (['meta_pos','meta_frame','meta_ch','meta_slice'] if metaset else [])
	with open(csvpath, 'wb') as f:
		writer = csv.writer(f)
		writer.writerow(header)
		for pos in poss:
			writer.writerow(pos)


def updateDatasets():
	import csv

	csvpath = os.path.join('..', 'datasets.csv')
	with open(csvpath, 'wb') as f:
		writer = csv.writer(f)
		writer.writerow(['uuid', 'name', 'folder', 'metaset', 'images', 'positions','frames','channels','slices', 'metasetdim'])
		for d in sorted(datasets_processed,key=lambda a: a[1]):     # Sorted by name
			writer.writerow(d)


datasets_processed = []


def process_set(dataset):
	print('Processing: ' + dataset)
	num_cores = multiprocessing.cpu_count()
	poss = Parallel(n_jobs=num_cores)(delayed(readMetadataFolder)(dataset, subfolder) for subfolder
	                                  in os.listdir(dataset) if os.path.isdir(os.path.join(dataset, subfolder)))
	poss = [x for x in poss if x is not None]
	set_uuid = poss[0][1]

	global imgcount
	imgcount += sum(map(lambda a: a[2], poss))

	# Sort by time or position
	sort_by_time = True
	key = 8 if sort_by_time else 4
	pos_flatten = sorted(reduce(lambda c, d: c + d, map(lambda b: b[0], filter(lambda a: a is not None, poss))),
	                     key=lambda e: e[key])

	write_to_csv(pos_flatten, set_uuid)

	num_pos = 1 + max(map(lambda a: a[4], pos_flatten))
	num_fr = 1 + max(map(lambda a: a[5], pos_flatten))
	num_ch = 1 + max(map(lambda a: a[6], pos_flatten))
	num_sl = 1 + max(map(lambda a: a[7], pos_flatten))

	import re

	m = re.search('/(\d{6,8}.+?/.+?)/', dataset)
	name = m.group(1)
	datasets_processed.append((set_uuid, name, dataset, 0, len(pos_flatten), num_pos, num_fr, num_ch, num_sl))

	print('\nProcessed: ' + set_uuid)


def process_metaset(ds):
	print('Processing: ' + ds['name'])
	num_cores = multiprocessing.cpu_count()

	pos_all = []
	set_uuid = []
	for idx, dataset in enumerate(ds['folders']):
		poss = Parallel(n_jobs=num_cores)(delayed(readMetadataFolder)(dataset, subfolder, metaset=True, metaset_idx=idx,metaset_dim=ds['dimension']) for subfolder
		                                  in os.listdir(dataset) if os.path.isdir(os.path.join(dataset, subfolder)))
		pos_all += [x for x in poss if x is not None]
		global imgcount
		imgcount += sum(map(lambda a: a[2], pos_all))
		if len(pos_all) > 0:
			set_uuid.append(pos_all[0][1])

	# Sort by time or position
	sort_by_time = True
	key = 7 if sort_by_time else 3
	pos_flatten = sorted(reduce(lambda c, d: c + d, map(lambda b: b[0], filter(lambda a: a is not None, pos_all))),
	                     key=lambda e: e[key])


	num_pos = (1 + max(map(lambda a: a[15], pos_flatten))) if ds['dimension'] == 'pos' else  (1 + max(map(lambda a: a[4], pos_flatten)))
	num_fr = (1 + max(map(lambda a: a[16], pos_flatten))) if ds['dimension'] == 'frame' else  (1 + max(map(lambda a: a[5], pos_flatten)))
	num_ch = (1 + max(map(lambda a: a[17], pos_flatten))) if ds['dimension'] == 'ch' else  (1 + max(map(lambda a: a[6], pos_flatten)))
	num_sl = (1 + max(map(lambda a: a[18], pos_flatten))) if ds['dimension'] == 'slice' else  (1 + max(map(lambda a: a[7], pos_flatten)))

	import hashlib

	id = hashlib.sha256(','.join(sorted(set_uuid))).hexdigest()
	write_to_csv(pos_flatten, 'metaset_%s' % (id), metaset=True)

	datasets_processed.append(('metaset_' + id, ds['name'], id,1,len(pos_flatten), num_pos, num_fr, num_ch, num_sl, ds.get('dimension')))

	print('\nProcessed: ' + id)


def main():
	import time
	initial = time.time()
	for d in datasets:
		if isinstance(d, dict):
			process_metaset(d)
		else:
			process_set(d)
	updateDatasets()
	final = time.time()
	print('Done. %d images processed (%d images converted). %.1f sec total.' % (sum([d[4] for d in datasets_processed]),imgcount,final-initial))

main()
